import { Page } from '@playwright/test'
import { ProductLocators } from '@/properties/product.locators'

export class ProductPage {
    constructor(private page: Page) {}

    async getTitle(): Promise<string> {
        await this.page.waitForSelector(ProductLocators.productTitle, { timeout: 15_000 })
        return await this.page.locator(ProductLocators.productTitle).innerText()
    }

    async addToCart() {
        // Scroll to Add to Cart button — it can be below the fold
        await this.page.locator(ProductLocators.addToCartButton).scrollIntoViewIfNeeded()
        await this.page.waitForTimeout(500)
        await this.page.locator(ProductLocators.addToCartButton).click()
        // Wait for cart confirmation to appear
        await this.page.waitForTimeout(2000)
    }
}
