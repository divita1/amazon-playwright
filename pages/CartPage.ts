import { Page } from '@playwright/test'
import { CartLocators } from '@/properties/cart.locators'

export class CartPage {
    constructor(private page: Page) {}

    async getCartCount(): Promise<string> {
        return await this.page.locator(CartLocators.cartCount).innerText()
    }

    async isCartLoaded(): Promise<boolean> {
        try {
            await this.page.waitForSelector(CartLocators.cartTitle, { timeout: 10_000 })
            return true
        } catch {
            return false
        }
    }
}
