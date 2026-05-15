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

    async selectFirstResult() {
        await this.page.locator(SearchLocators.firstResult).first().click()
    }
}
