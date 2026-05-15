import { Page } from '@playwright/test'
import { ProductLocators } from '@/properties/product.locators'
import { healClick } from '@/utils/heal-actions'

export class ProductPage {
    constructor(private page: Page) {}

    async getTitle(): Promise<string> {
        return await this.page.locator(ProductLocators.productTitle).innerText()
    }

    async addToCart() {
        await healClick(this.page, ProductLocators.addToCartButton, 'addToCart')
    }
}
