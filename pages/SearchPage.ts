import { Page } from '@playwright/test'
import { SearchLocators } from '@/properties/search.locators'
import { amazonTenant } from '@/config/tenants/amazon.tenant'

export class SearchPage {
    constructor(private page: Page) {}

    async navigate() {
        await this.page.goto(amazonTenant.url)
        await this.page.waitForLoadState('domcontentloaded')
    }

    async search(keyword: string) {
        await this.page.waitForSelector(SearchLocators.searchBox, { timeout: 15_000 })
        await this.page.fill(SearchLocators.searchBox, keyword)
        await this.page.click(SearchLocators.searchButton)
        // Wait for results page to load fully
        await this.page.waitForLoadState('domcontentloaded')
        await this.page.waitForTimeout(2000)
        // Scroll down slowly like a human scanning the page
        await this.scrollToLoadResults()
    }

    async hasResults(): Promise<boolean> {
        try {
            await this.page.waitForSelector(SearchLocators.firstResult, { timeout: 15_000 })
            return true
        } catch {
            return false
        }
    }

    async selectFirstResult() {
        await this.scrollToLoadResults()
        await this.page.locator(SearchLocators.firstResult).first().scrollIntoViewIfNeeded()
        await this.page.locator(SearchLocators.firstResult).first().click()
        await this.page.waitForLoadState('domcontentloaded')
    }

    async findProductByName(productName: string): Promise<boolean> {
        try {
            await this.page.waitForSelector(SearchLocators.firstResult, { timeout: 15_000 })
            await this.scrollToLoadResults()

            const results = this.page.locator(SearchLocators.firstResult)
            const count = await results.count()

            for (let i = 0; i < count; i++) {
                const text = await results.nth(i).innerText()
                if (text.toLowerCase().includes(productName.toLowerCase())) {
                    await results.nth(i).scrollIntoViewIfNeeded()
                    await results.nth(i).click()
                    await this.page.waitForLoadState('domcontentloaded')
                    return true
                }
            }
            return false
        } catch {
            return false
        }
    }

    private async scrollToLoadResults(): Promise<void> {
        // Scroll in steps like a human — gives lazy-loaded content time to appear
        for (let i = 1; i <= 5; i++) {
            await this.page.evaluate((step) => {
                window.scrollBy(0, window.innerHeight * step * 0.4)
            }, i)
            await this.page.waitForTimeout(500)
        }
        // Scroll back to top so first result is visible
        await this.page.evaluate(() => window.scrollTo(0, 0))
        await this.page.waitForTimeout(300)
    }
}
