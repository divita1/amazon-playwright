import { test as base } from '@playwright/test'
import { SearchPage } from '@/pages/SearchPage'
import { ProductPage } from '@/pages/ProductPage'
import { CartPage } from '@/pages/CartPage'

type Pages = {
    searchPage: SearchPage
    productPage: ProductPage
    cartPage: CartPage
}

export const test = base.extend<Pages>({
    searchPage: async ({ page }, use) => {
        const searchPage = new SearchPage(page)
        await use(searchPage)
    },

    productPage: async ({ page }, use) => {
        const productPage = new ProductPage(page)
        await use(productPage)
    },

    cartPage: async ({ page }, use) => {
        const cartPage = new CartPage(page)
        await use(cartPage)
    },
})
