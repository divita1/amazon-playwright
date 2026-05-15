import { Page } from '@playwright/test'
import { ProductLocators } from '@/properties/product.locators'

export class ProductPage {
    constructor(private page: Page) {}

    async getTitle(): Promise<string> {
        return await this.page.locator(ProductLocators.productTitle).innerText()
    }

    async addToCart() {
        await this.page.click(ProductLocators.addToCartButton)
    }
}
