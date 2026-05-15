import { Page } from '@playwright/test'
import { SearchLocators } from '@/properties/search.locators'
import { amazonTenant } from '@/config/tenants/amazon.tenant'

export class SearchPage {
    constructor(private page: Page) {}

    async navigate() {
        await this.page.goto(amazonTenant.url)
    }

    async search(keyword: string) {
        await this.page.fill(SearchLocators.searchBox, keyword)
        await this.page.click(SearchLocators.searchButton)
    }

    async hasResults(): Promise<boolean> {
        try {
            await this.page.waitForSelector(SearchLocators.firstResult, { timeout: 10_000 })
            return true
        } catch {
            return false
        }
    }

    async selectFirstResult() {
        await this.page.locator(SearchLocators.firstResult).first().click()
    }

    async findProductByName(productName: string): Promise<boolean> {
        try {
            await this.page.waitForSelector(SearchLocators.firstResult, { timeout: 10_000 })
            const results = this.page.locator(SearchLocators.firstResult)
            const count = await results.count()
            for (let i = 0; i < count; i++) {
                const text = await results.nth(i).innerText()
                if (text.toLowerCase().includes(productName.toLowerCase())) {
                    await results.nth(i).click()
                    return true
                }
            }
            return false
        } catch {
            return false
        }
    }
}
