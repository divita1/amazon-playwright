import { Page } from '@playwright/test'
import { SearchLocators } from '@/properties/search.locators'
import { amazonTenant } from '@/config/tenants/amazon.tenant'
import { healClick, healFill } from '@/utils/heal-actions'

export class SearchPage {
    constructor(private page: Page) {}

    async navigate() {
        await this.page.goto(amazonTenant.url)
    }

    async search(keyword: string) {
        await healFill(this.page, SearchLocators.searchBox, keyword, 'search')
        await healClick(this.page, SearchLocators.searchButton, 'search')
    }

    async selectFirstResult() {
        await healClick(this.page, SearchLocators.firstResult, 'selectFirstResult')
    }
}
